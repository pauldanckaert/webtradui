#!/usr/bin/perl -w

use XML::Twig;
use Text::Soundex;
use Text::Metaphone;
use Text::DoubleMetaphone qw( double_metaphone );

#my $xs = new XML::Simple();
#
#$wordData = $xs->XMLin('data/word_dictionary.xml');
#
#foreach my $term (@{$wordData->{DicE2K}->{term}}) {
#	$wordSoundex = soundex($term->{word});
#	$wordMetaphone = Metaphone($term->{word});
#	$wordDMetaphone = double_metaphone($term->{word});
#	$term->{soundex} = $wordSoundex;
#	$term->{metaphone} = $wordMetaphone;
#	$term->{dMetaphone} = $wordDMetaphone;
#}
#
#foreach my $term (@{$wordData->{dict}->{term}}) {
#	$wordSoundex = soundex($term->{word});
#	$wordMetaphone = Metaphone($term->{word});
#	$wordDMetaphone = double_metaphone($term->{word});
#	$term->{soundex} = $wordSoundex;
#	$term->{metaphone} = $wordMetaphone;
#	$term->{dMetaphone} = $wordDMetaphone;
#}
#
#print $xs->XMLout($wordData);

my $twig = XML::Twig->new(
			start_tag_handlers =>
				{ 'term' => \&termparser });

$twig->parsefile("data/word_dictionary.xml");

my $root = $twig->root;

print $root;


sub termparser {
	my ($twig, $elt) = @_;
	print "term: " . $elt{word} . "\n";
}
